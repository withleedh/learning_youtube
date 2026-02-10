#!/usr/bin/env npx tsx
/**
 * Episode Thumbnail Generator
 *
 * Generates episode thumbnail by overlaying title text on scene_1.png
 *
 * Usage:
 *   npx tsx scripts/generate-episode-thumbnail.ts <outputDir>
 *   npx tsx scripts/generate-episode-thumbnail.ts output/english/2026-02-03_115630
 *
 * Options:
 *   --title "..."     Override title from script
 *   --subtitle "..."  Override subtitle text
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import type { Script } from '../src/script/types';

async function generateVideoThumbnail(
  backgroundPath: string,
  titleText: string,
  subtitleText: string,
  outputPath: string
): Promise<void> {
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
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Add bottom gradient overlay
  const gradient = ctx.createLinearGradient(0, HEIGHT * 0.5, 0, HEIGHT);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // Title font size
  let titleFontSize = 90;
  if (titleText.length > 20) titleFontSize = 79;
  if (titleText.length > 30) titleFontSize = 68;

  // Subtitle font size
  let subtitleFontSize = 135;
  if (subtitleText.length > 15) subtitleFontSize = 110;
  if (subtitleText.length > 25) subtitleFontSize = 90;
  if (subtitleText.length > 35) subtitleFontSize = 75;

  const subtitleY = HEIGHT - 30;
  const titleY = subtitleY - subtitleFontSize - 24;

  // Draw title
  ctx.font = `bold ${titleFontSize}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.strokeText(titleText, WIDTH / 2, titleY);

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText(titleText, WIDTH / 2, titleY);

  // Draw subtitle
  ctx.font = `bold ${subtitleFontSize}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 10;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.strokeText(subtitleText, WIDTH / 2, subtitleY);

  ctx.fillStyle = '#FF1493';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText(subtitleText, WIDTH / 2, subtitleY);

  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(outputPath, buffer);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🖼️ Episode Thumbnail Generator

Usage:
  npx tsx scripts/generate-episode-thumbnail.ts <outputDir>

Arguments:
  outputDir    Path to output folder (e.g., output/english/2026-02-03_115630)

Options:
  --title "..."     Override title from script
  --subtitle "..."  Override subtitle text (default: "들려요! 10분 영어")

Examples:
  npx tsx scripts/generate-episode-thumbnail.ts output/english/2026-02-03_115630
  npx tsx scripts/generate-episode-thumbnail.ts output/english/2026-02-03_115630 --title "카페 주문하기"
`);
    process.exit(0);
  }

  const outputDir = args[0];
  let titleOverride: string | undefined;
  let subtitleOverride: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      titleOverride = args[++i];
    } else if (args[i] === '--subtitle' && args[i + 1]) {
      subtitleOverride = args[++i];
    }
  }

  // Verify output directory exists
  try {
    await fs.access(outputDir);
  } catch {
    console.error(`❌ Output directory not found: ${outputDir}`);
    process.exit(1);
  }

  // Find background image (scene_1.png or background.png)
  let backgroundPath = path.join(outputDir, 'scene_1.png');
  try {
    await fs.access(backgroundPath);
  } catch {
    backgroundPath = path.join(outputDir, 'background.png');
    try {
      await fs.access(backgroundPath);
    } catch {
      console.error(`❌ No background image found (scene_1.png or background.png)`);
      process.exit(1);
    }
  }

  // Find and load script file
  const files = await fs.readdir(outputDir);
  const scriptFile = files.find(
    (f) => f.endsWith('.json') && !f.includes('manifest') && !f.includes('config')
  );

  if (!scriptFile && !titleOverride) {
    console.error(`❌ No script file found and no --title provided`);
    process.exit(1);
  }

  let title = titleOverride || '';
  if (!titleOverride && scriptFile) {
    const scriptPath = path.join(outputDir, scriptFile);
    const scriptContent = await fs.readFile(scriptPath, 'utf-8');
    const script: Script = JSON.parse(scriptContent);
    title = script.metadata.title.native;
  }

  const subtitle = subtitleOverride || '들려요! 10분 영어';
  const outputPath = path.join(outputDir, 'episode_thumbnail.png');

  console.log(`
🖼️ Episode Thumbnail Generator
==============================
Background: ${path.basename(backgroundPath)}
Title: ${title}
Subtitle: ${subtitle}
Output: episode_thumbnail.png
`);

  await generateVideoThumbnail(backgroundPath, title, subtitle, outputPath);

  console.log(`✅ Thumbnail generated: ${outputPath}`);
}

main().catch(console.error);
