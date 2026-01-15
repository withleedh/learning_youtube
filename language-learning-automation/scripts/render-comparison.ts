#!/usr/bin/env tsx
/**
 * Render Comparison Video
 *
 * Usage:
 *   npx tsx scripts/render-comparison.ts <channelId> <outputFolder>
 *
 * Example:
 *   npx tsx scripts/render-comparison.ts korean-vs-native 2026-01-15_comparison
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { ComparisonScript } from '../src/comparison/types';
import type { TimingProfileType } from '../src/comparison/timing-profile';
import { calculateTotalDuration } from '../src/compositions/ComparisonLongform';
import { loadAudioManifest, type ComparisonAudioManifest } from '../src/comparison/audio';

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
 * Setup public folder for Remotion rendering
 */
async function setupPublicFolder(channelId: string, outputFolder: string): Promise<void> {
  const sourceDir = path.join(process.cwd(), 'output', channelId, outputFolder);
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

  console.log('   ✅ Public folder ready');
}

async function renderComparison() {
  console.log('🎬 Rendering Comparison Longform Video...\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/render-comparison.ts <channelId> <outputFolder>');
    console.error('Example: npx tsx scripts/render-comparison.ts korean-vs-native 2026-01-15_comparison');
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

  // Load script
  const scriptPath = path.join(baseDir, 'script.json');
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: ComparisonScript = JSON.parse(scriptContent);

  console.log(`📝 Script: ${script.title.korean}`);
  console.log(`📊 Segments: ${script.segments.length}`);

  // Load pipeline config (for timing profile)
  let timingProfile: TimingProfileType = 'normal';
  try {
    const configPath = path.join(baseDir, 'pipeline-config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const pipelineConfig = JSON.parse(configContent);
    timingProfile = pipelineConfig.timingProfile || 'normal';
  } catch {
    console.log('   ⚠️ No pipeline config found, using default timing');
  }
  console.log(`⏱️  Timing Profile: ${timingProfile}`);

  // Load audio manifest (optional)
  let audioManifest: ComparisonAudioManifest | null = null;
  try {
    const manifestPath = path.join(baseDir, 'audio_manifest.json');
    audioManifest = await loadAudioManifest(manifestPath);
    console.log(`🎤 Audio: ${audioManifest.totalDuration.toFixed(1)}s total`);
  } catch {
    console.log('   ⚠️ No audio manifest found');
  }

  // Setup public folder
  await setupPublicFolder(channelId, outputFolder);

  // Bundle the Remotion project
  console.log('\n📦 Bundling Remotion project...');
  const publicDir = path.join(process.cwd(), 'public');
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/index.ts'),
    webpackOverride: (config) => config,
    publicDir,
  });

  console.log(`📂 Bundle location: ${bundleLocation}`);

  // Calculate duration
  const durationInFrames = calculateTotalDuration(script.segments.length, timingProfile);
  console.log(`📊 Duration: ${durationInFrames} frames (${(durationInFrames / 30).toFixed(1)}s)`);

  // Build inputProps
  const inputProps = {
    script,
    timingProfile,
    backgroundImage: 'background.png',
    selectedHookVariant: 0,
    // Audio files would be passed here if available
  };

  // Select the ComparisonLongform composition
  console.log('\n🎯 Selecting composition...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'ComparisonLongform',
    inputProps,
  });

  // Output path
  const outputPath = path.join(baseDir, 'video.mp4');

  // Render the video
  console.log(`\n🎬 Rendering video to: ${outputPath}`);
  console.log(`   Duration: ${composition.durationInFrames} frames (${(composition.durationInFrames / 30).toFixed(1)}s)`);

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

  console.log('\n🎉 Done!');
}

// Run
renderComparison().catch((err) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});
