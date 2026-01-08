#!/usr/bin/env npx ts-node
/**
 * Thumbnail Generator Script
 *
 * Usage:
 *   npx tsx scripts/generate-thumbnail.ts <channelId> [options]
 *
 * Examples:
 *   npx tsx scripts/generate-thumbnail.ts english
 *   npx tsx scripts/generate-thumbnail.ts english --title "Weekend Getaway"
 *
 * By default, reads thumbnail settings from channel config (channels/{channelId}.json).
 * CLI options override config values.
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { generateThumbnail, type ThumbnailOptions } from '../src/image/generator';
import { channelConfigSchema, type Thumbnail } from '../src/config/types';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🎨 Thumbnail Generator

Usage:
  npx tsx scripts/generate-thumbnail.ts <channelId> [options]

Arguments:
  channelId       Channel ID (e.g., 'english')

Options:
  --title "..."   Episode title to show on thumbnail
  --name "..."    Override channel name from config
  --animals       Use animal characters
  --humans        Use human characters
  --custom "..."  Custom character description
  --bg "..."      Background color

By default, reads from channel config's "thumbnail" section.
CLI options override config values.

Examples:
  npx tsx scripts/generate-thumbnail.ts english
  npx tsx scripts/generate-thumbnail.ts english --title "Weekend Getaway"
  npx tsx scripts/generate-thumbnail.ts english --name "My Channel" --humans
`);
    process.exit(0);
  }

  const channelId = args[0];

  // Load channel config
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  try {
    await fs.access(configPath);
  } catch {
    console.error(`❌ Channel config not found: ${configPath}`);
    process.exit(1);
  }

  const configContent = await fs.readFile(configPath, 'utf-8');
  const rawConfig = JSON.parse(configContent);
  const config = channelConfigSchema.parse(rawConfig);

  // Get thumbnail config from channel (with defaults)
  const thumbnailConfig: Thumbnail = config.thumbnail || {};

  // Parse CLI options (override config values)
  let episodeTitle: string | undefined;
  let cliChannelName: string | undefined;
  let cliCharacterStyle: 'animals' | 'humans' | 'custom' | undefined;
  let cliCustomCharacters: string | undefined;
  let cliBackgroundColor: string | undefined;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--title' && args[i + 1]) {
      episodeTitle = args[++i];
    } else if (arg === '--name' && args[i + 1]) {
      cliChannelName = args[++i];
    } else if (arg === '--animals') {
      cliCharacterStyle = 'animals';
    } else if (arg === '--humans') {
      cliCharacterStyle = 'humans';
    } else if (arg === '--custom' && args[i + 1]) {
      cliCharacterStyle = 'custom';
      cliCustomCharacters = args[++i];
    } else if (arg === '--bg' && args[i + 1]) {
      cliBackgroundColor = args[++i];
    }
  }

  // Merge config with CLI overrides (CLI takes precedence)
  const channelName = cliChannelName || thumbnailConfig.channelName || config.meta.name;
  const characterStyle = cliCharacterStyle || thumbnailConfig.characterStyle || 'animals';
  const customCharacters = cliCustomCharacters || thumbnailConfig.customCharacters;
  const backgroundColor = cliBackgroundColor || thumbnailConfig.backgroundColor || 'dark blue';
  const targetLanguage = config.meta.targetLanguage;
  const nativeLanguage = config.meta.nativeLanguage;

  console.log(`
🎨 Thumbnail Generator
======================
Channel: ${channelName} (${channelId})
Episode: ${episodeTitle || '(none)'}
Characters: ${characterStyle}${customCharacters ? ` (${customCharacters.substring(0, 50)}...)` : ''}
Background: ${backgroundColor}
Target Language: ${targetLanguage}
Native Language: ${nativeLanguage}
`);

  // Generate thumbnail
  const today = new Date().toISOString().split('T')[0];
  const outputDir = path.join(process.cwd(), 'output', channelId, today);
  await fs.mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'thumbnail.png');

  const options: ThumbnailOptions = {
    channelName,
    episodeTitle,
    characterStyle,
    customCharacters,
    backgroundColor,
    targetLanguage,
    nativeLanguage,
    outputPath,
  };

  try {
    await generateThumbnail(options);
    console.log(`
✅ Thumbnail generated successfully!
📁 Output: ${outputPath}
`);
  } catch (error) {
    console.error('❌ Failed to generate thumbnail:', error);
    process.exit(1);
  }
}

main();
