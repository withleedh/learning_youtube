#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';

const WIDTH = 1280;
const HEIGHT = 720;

async function generateVideoThumbnail(
  backgroundPath: string,
  titleText: string,
  subtitleText: string, // "영어 듣기 연습" 등
  outputPath: string
): Promise<void> {
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
  } catch (err) {
    console.log('⚠️ Background load failed, using gradient');
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

  // Title - white text with black stroke
  let titleFontSize = 90; // 72 * 1.25
  if (titleText.length > 20) titleFontSize = 79; // 63 * 1.25
  if (titleText.length > 30) titleFontSize = 68; // 54 * 1.25

  ctx.font = `bold ${titleFontSize}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;

  // Subtitle - pink/magenta (125% of previous: 108 * 1.25 = 135)
  const subtitleFontSize = 108;
  const subtitleY = HEIGHT - 30;
  const titleY = subtitleY - subtitleFontSize - 24; // 24px gap between title and subtitle

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

  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(outputPath, buffer);
}

async function main() {
  const outputDir = process.argv[2] || 'output/english/2026-01-14_123259';

  console.log(`📁 Testing thumbnail generation for: ${outputDir}`);

  // Find script file
  const files = await fs.readdir(outputDir);
  const scriptFile = files.find((f) => f.endsWith('.json') && f.match(/^\d{4}-\d{2}-\d{2}_/));

  if (!scriptFile) {
    console.error('❌ No script file found');
    process.exit(1);
  }

  // Load script
  const scriptPath = path.join(outputDir, scriptFile);
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script = JSON.parse(scriptContent);

  const titleText = script.metadata.title.native;
  const subtitleText = '인생이 바뀌는 10분';
  const backgroundPath = path.join(outputDir, 'background.png');
  const thumbnailPath = path.join(outputDir, 'thumbnail.png');

  console.log(`📝 Title: ${titleText}`);
  console.log(`📝 Subtitle: ${subtitleText}`);
  console.log(`🖼️ Background: ${backgroundPath}`);

  await generateVideoThumbnail(backgroundPath, titleText, subtitleText, thumbnailPath);

  console.log(`✅ Thumbnail created: ${thumbnailPath}`);
}

main().catch(console.error);
