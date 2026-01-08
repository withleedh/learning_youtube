#!/usr/bin/env npx ts-node
/**
 * Intro Asset Generator Script
 *
 * Usage:
 *   npx ts-node scripts/generate-intro.ts <channelId> [style]
 *
 * Examples:
 *   npx ts-node scripts/generate-intro.ts english
 *   npx ts-node scripts/generate-intro.ts english neon
 *   npx ts-node scripts/generate-intro.ts english --force
 *
 * Styles: modern, neon, gradient, minimal, cinematic
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { IntroGenerator } from '../src/intro/generator';
import type { IntroAssetConfig, IntroStyle } from '../src/intro/types';

const VALID_STYLES: IntroStyle[] = ['modern', 'neon', 'gradient', 'minimal', 'cinematic'];

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🎬 Intro Asset Generator

Usage:
  npx ts-node scripts/generate-intro.ts <channelId> [style] [--force]

Arguments:
  channelId   Channel ID (e.g., 'english')
  style       Visual style (default: modern)
              Options: ${VALID_STYLES.join(', ')}
  --force     Regenerate even if assets exist

Examples:
  npx ts-node scripts/generate-intro.ts english
  npx ts-node scripts/generate-intro.ts english neon
  npx ts-node scripts/generate-intro.ts english cinematic --force
`);
    process.exit(0);
  }

  const channelId = args[0];
  const force = args.includes('--force');

  // 스타일 파싱
  let style: IntroStyle = 'modern';
  for (const arg of args.slice(1)) {
    if (VALID_STYLES.includes(arg as IntroStyle)) {
      style = arg as IntroStyle;
      break;
    }
  }

  // API 키 확인
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY environment variable is required');
    process.exit(1);
  }

  // 채널 설정 로드
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  try {
    await fs.access(configPath);
  } catch {
    console.error(`❌ Channel config not found: ${configPath}`);
    process.exit(1);
  }

  const configContent = await fs.readFile(configPath, 'utf-8');
  const channelConfig = JSON.parse(configContent);

  console.log(`
🎬 Intro Asset Generator
========================
Channel: ${channelConfig.meta.name} (${channelId})
Style: ${style}
Force: ${force}
`);

  const introConfig: IntroAssetConfig = {
    channelId,
    channelName: channelConfig.meta.name,
    targetLanguage: channelConfig.meta.targetLanguage,
    nativeLanguage: channelConfig.meta.nativeLanguage,
    primaryColor: channelConfig.theme.primaryColor || '#87CEEB',
    secondaryColor: channelConfig.theme.secondaryColor || '#FF69B4',
    style,
  };

  const generator = new IntroGenerator(apiKey);
  const outputDir = path.join(process.cwd(), 'assets', channelId);

  try {
    const assets = await generator.generateIntroAssets(introConfig, {
      outputDir,
      force,
    });

    console.log(`
✅ Intro assets generated successfully!

Files:
  📁 ${outputDir}/intro/
  🖼️  background.png
  📄 manifest.json

Generated at: ${assets.generatedAt}
Style: ${assets.style}

Next steps:
  1. Review the generated background image
  2. If not satisfied, run with a different style:
     npx ts-node scripts/generate-intro.ts ${channelId} neon --force
`);
  } catch (error) {
    console.error('❌ Failed to generate intro assets:', error);
    process.exit(1);
  }
}

main();
