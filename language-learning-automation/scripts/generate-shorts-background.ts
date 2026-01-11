#!/usr/bin/env node
import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { generateShortsBackground } from '../src/image/generator';
import type { Script } from '../src/script/types';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
🎨 Shorts Background Generator

Usage:
  npx tsx scripts/generate-shorts-background.ts <channelId> <folderName>

Examples:
  npx tsx scripts/generate-shorts-background.ts english_korean 2026-01-09_150452
  npx tsx scripts/generate-shorts-background.ts english 2026-01-09_114349

This generates a 9:16 vertical background image optimized for YouTube Shorts.
`);
    process.exit(1);
  }

  const channelId = args[0];
  const folderName = args[1];
  const outputDir = path.join(process.cwd(), 'output', channelId, folderName);

  // Verify directory exists
  try {
    await fs.access(outputDir);
  } catch {
    console.error(`❌ Directory not found: ${outputDir}`);
    process.exit(1);
  }

  // Find script file
  const files = await fs.readdir(outputDir);
  const scriptFile = files.find(
    (f) => f.endsWith('.json') && f.match(/^\d{4}-\d{2}-\d{2}_.*\.json$/)
  );

  if (!scriptFile) {
    console.error(`❌ No script file found in ${outputDir}`);
    process.exit(1);
  }

  // Load script
  const scriptPath = path.join(outputDir, scriptFile);
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: Script = JSON.parse(scriptContent);

  console.log(`\n🎨 Shorts Background Generator`);
  console.log(`   Channel: ${channelId}`);
  console.log(`   Folder: ${folderName}`);
  console.log(`   Episode: ${script.metadata.title.native}`);
  console.log(`   Category: ${script.category}\n`);

  try {
    const imagePath = await generateShortsBackground(script, outputDir);
    console.log(`\n✅ Done! Image saved to: ${imagePath}`);
  } catch (error) {
    console.error(`\n❌ Failed to generate shorts background:`, error);
    process.exit(1);
  }
}

main();
