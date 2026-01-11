#!/usr/bin/env npx tsx
/**
 * 썸네일 배치 생성 CLI
 * 여러 개의 썸네일을 생성해서 고를 수 있게 함
 *
 * Usage:
 *   npx tsx scripts/generate-thumbnails-batch.ts --channel english --count 10
 *   npx tsx scripts/generate-thumbnails-batch.ts --channel english_korean --count 5
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { generateThumbnail } from '../src/image/generator';

interface Args {
  channel: string;
  count: number;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let channel = 'english';
  let count = 10;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--channel' && args[i + 1]) {
      channel = args[i + 1];
      i++;
    } else if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { channel, count };
}

async function main() {
  const { channel, count } = parseArgs();

  console.log(`🎨 Generating ${count} thumbnails for channel: ${channel}\n`);

  // Load channel config
  const configPath = path.join(process.cwd(), 'channels', `${channel}.json`);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config = JSON.parse(configContent);

  const thumbnailConfig = config.thumbnail || {};

  // Create output directory
  const outputDir = path.join(process.cwd(), 'output', channel, 'thumbnails');
  await fs.mkdir(outputDir, { recursive: true });

  console.log(`📁 Output directory: ${outputDir}\n`);

  const results: { index: number; path: string; success: boolean }[] = [];

  for (let i = 1; i <= count; i++) {
    const outputPath = path.join(outputDir, `thumbnail_${String(i).padStart(2, '0')}.png`);

    console.log(`[${i}/${count}] Generating thumbnail...`);

    try {
      await generateThumbnail({
        channelName: thumbnailConfig.channelName || config.meta.name,
        characterStyle: thumbnailConfig.characterStyle || 'animals',
        customCharacters: thumbnailConfig.customCharacters,
        backgroundColor: thumbnailConfig.backgroundColor || 'dark blue',
        targetLanguage: config.meta.targetLanguage,
        nativeLanguage: config.meta.nativeLanguage,
        outputPath,
      });

      results.push({ index: i, path: outputPath, success: true });
      console.log(`   ✅ Saved: thumbnail_${String(i).padStart(2, '0')}.png\n`);
    } catch (error) {
      results.push({ index: i, path: outputPath, success: false });
      console.log(`   ❌ Failed: ${error}\n`);
    }

    // Rate limiting - wait 2 seconds between requests
    if (i < count) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`\n📁 Check thumbnails at: ${outputDir}`);
  console.log(`   Open in Finder: open "${outputDir}"`);
}

main().catch(console.error);
