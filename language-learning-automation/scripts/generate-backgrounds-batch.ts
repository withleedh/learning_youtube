#!/usr/bin/env npx tsx
/**
 * 배경 이미지 배치 생성 CLI
 * 에피소드의 background.png를 여러 장 생성해서 고를 수 있게 함
 *
 * Usage:
 *   npx tsx scripts/generate-backgrounds-batch.ts --channel japan_english --folder 2026-01-13_004109 --count 5
 *   npx tsx scripts/generate-backgrounds-batch.ts --channel english --folder 2026-01-10_212800 --count 3 --style ghibli
 *   npx tsx scripts/generate-backgrounds-batch.ts --list-styles  # 사용 가능한 스타일 목록
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { generateIllustration } from '../src/image/generator';
import { IMAGE_STYLES } from '../src/image/art-styles';
import type { Script } from '../src/script/types';

const STYLE_IDS = IMAGE_STYLES.map((s) => s.id);

interface Args {
  channel: string;
  folder: string;
  count: number;
  style?: string;
  listStyles: boolean;
  all: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let channel = '';
  let folder = '';
  let count = 5;
  let style: string | undefined;
  let listStyles = false;
  let all = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--channel' && args[i + 1]) {
      channel = args[i + 1];
      i++;
    } else if (args[i] === '--folder' && args[i + 1]) {
      folder = args[i + 1];
      i++;
    } else if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--style' && args[i + 1]) {
      style = args[i + 1];
      i++;
    } else if (args[i] === '--list-styles') {
      listStyles = true;
    } else if (args[i] === '--all') {
      all = true;
    }
  }

  return { channel, folder, count, style, listStyles, all };
}

function printStyles() {
  console.log('\n🎨 Available Styles:\n');
  console.log('ID                    | Name');
  console.log('----------------------|------------------------');
  for (const style of IMAGE_STYLES) {
    console.log(`${style.id.padEnd(21)} | ${style.name}`);
  }
  console.log('\nUsage: --style <id>');
  console.log('Example: --style ghibli');
  console.log('If no style specified, a random style will be used for each image.\n');
}

async function findScriptFile(episodeDir: string): Promise<string | null> {
  const files = await fs.readdir(episodeDir);
  const scriptFile = files.find((f) => f.endsWith('.json') && !f.includes('manifest'));
  return scriptFile ? path.join(episodeDir, scriptFile) : null;
}

async function main() {
  const { channel, folder, count, style, listStyles, all } = parseArgs();

  // 스타일 목록 출력
  if (listStyles) {
    printStyles();
    return;
  }

  if (!channel || !folder) {
    console.error(
      'Usage: npx tsx scripts/generate-backgrounds-batch.ts --channel <channelId> --folder <folderName> [--count <number>] [--style <styleId>] [--all]'
    );
    console.error(
      'Example: npx tsx scripts/generate-backgrounds-batch.ts --channel japan_english --folder 2026-01-13_004109 --count 5 --style ghibli'
    );
    console.error(
      '         npx tsx scripts/generate-backgrounds-batch.ts --channel japan_english --folder 2026-01-13_004109 --all'
    );
    console.error('\nRun with --list-styles to see available styles');
    process.exit(1);
  }

  // 스타일 유효성 검사
  if (style && !STYLE_IDS.includes(style)) {
    console.error(`❌ Unknown style: ${style}`);
    console.error(`Available styles: ${STYLE_IDS.join(', ')}`);
    process.exit(1);
  }

  const episodeDir = path.join(process.cwd(), 'output', channel, folder);

  // Check if episode directory exists
  try {
    await fs.access(episodeDir);
  } catch {
    console.error(`❌ Episode directory not found: ${episodeDir}`);
    process.exit(1);
  }

  // Find and load script file
  const scriptPath = await findScriptFile(episodeDir);
  if (!scriptPath) {
    console.error(`❌ No script JSON file found in: ${episodeDir}`);
    process.exit(1);
  }

  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: Script = JSON.parse(scriptContent);

  // Create backgrounds subdirectory
  const backgroundsDir = path.join(episodeDir, 'backgrounds');
  await fs.mkdir(backgroundsDir, { recursive: true });

  // --all 모드: 모든 스타일로 생성
  if (all) {
    console.log(
      `🎨 Generating backgrounds for ALL ${IMAGE_STYLES.length} styles: ${channel}/${folder}\n`
    );
    console.log(`📝 Topic: ${script.metadata.topic}`);
    console.log(`📝 Title: ${script.metadata.title.target}`);
    console.log(`📁 Output directory: ${backgroundsDir}\n`);

    const results: { styleId: string; styleName: string; success: boolean }[] = [];

    for (let i = 0; i < IMAGE_STYLES.length; i++) {
      const currentStyle = IMAGE_STYLES[i];
      const outputPath = path.join(backgroundsDir, `${currentStyle.id}.png`);

      console.log(`[${i + 1}/${IMAGE_STYLES.length}] ${currentStyle.name} (${currentStyle.id})...`);

      try {
        await generateIllustration(
          script.metadata.topic,
          script.metadata.title.target,
          script.metadata.imagePrompt || '',
          outputPath,
          currentStyle.id
        );

        results.push({ styleId: currentStyle.id, styleName: currentStyle.name, success: true });
        console.log(`   ✅ Saved: ${currentStyle.id}.png\n`);
      } catch (error) {
        results.push({ styleId: currentStyle.id, styleName: currentStyle.name, success: false });
        console.log(`   ❌ Failed: ${error}\n`);
      }

      // Rate limiting - wait 2 seconds between requests
      if (i < IMAGE_STYLES.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successful: ${successful}/${IMAGE_STYLES.length}`);
    console.log(`   ❌ Failed: ${failed}`);
    if (failed > 0) {
      console.log(
        `   Failed styles: ${results
          .filter((r) => !r.success)
          .map((r) => r.styleId)
          .join(', ')}`
      );
    }
    console.log(`\n📁 Check backgrounds at: ${backgroundsDir}`);
    console.log(`   Open in Finder: open "${backgroundsDir}"`);
    console.log(`\n💡 To use a background, copy it to the episode folder:`);
    console.log(`   cp "${backgroundsDir}/ghibli.png" "${episodeDir}/background.png"`);
    return;
  }

  // 일반 모드
  console.log(`🎨 Generating ${count} background images for: ${channel}/${folder}\n`);
  console.log(`📝 Topic: ${script.metadata.topic}`);
  console.log(`📝 Title: ${script.metadata.title.target}`);
  if (script.metadata.imagePrompt) {
    console.log(`📝 Image Prompt: ${script.metadata.imagePrompt.substring(0, 80)}...`);
  }
  if (style) {
    const styleInfo = IMAGE_STYLES.find((s) => s.id === style);
    console.log(`🖼️ Style: ${styleInfo?.name || style} (fixed)`);
  } else {
    console.log(`🖼️ Style: Random (different style for each image)`);
  }
  console.log();

  console.log(`📁 Output directory: ${backgroundsDir}\n`);

  const results: { index: number; path: string; style: string; success: boolean }[] = [];

  for (let i = 1; i <= count; i++) {
    const outputPath = path.join(backgroundsDir, `background_${String(i).padStart(2, '0')}.png`);

    console.log(`[${i}/${count}] Generating background...`);

    try {
      await generateIllustration(
        script.metadata.topic,
        script.metadata.title.target,
        script.metadata.imagePrompt || '',
        outputPath,
        style // undefined면 랜덤 선택됨
      );

      results.push({ index: i, path: outputPath, style: style || 'random', success: true });
      console.log(`   ✅ Saved: background_${String(i).padStart(2, '0')}.png\n`);
    } catch (error) {
      results.push({ index: i, path: outputPath, style: style || 'random', success: false });
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
  console.log(`\n📁 Check backgrounds at: ${backgroundsDir}`);
  console.log(`   Open in Finder: open "${backgroundsDir}"`);
  console.log(`\n💡 To use a background, copy it to the episode folder:`);
  console.log(`   cp "${backgroundsDir}/background_01.png" "${episodeDir}/background.png"`);
}

main().catch(console.error);
