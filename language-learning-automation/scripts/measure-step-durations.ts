#!/usr/bin/env npx ts-node
/**
 * Measure TTS durations for step narrations
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8' }
    );
    return parseFloat(result.trim());
  } catch {
    const stats = await fs.stat(filePath);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes / (16 * 1024);
  }
}

async function main() {
  const baseDir = path.join(process.cwd(), 'public/assets/english');
  const files = [
    'intro-step1.mp3',
    'intro-step2.mp3',
    'intro-step3.mp3',
    'intro-step4.mp3',
    'intro-closing.mp3',
  ];

  console.log('📏 Measuring step TTS durations...\n');

  const durations: number[] = [];

  for (const file of files) {
    const filePath = path.join(baseDir, file);
    try {
      const duration = await getAudioDuration(filePath);
      durations.push(duration);
      console.log(`${file}: ${duration.toFixed(3)}s`);
    } catch (e) {
      console.log(`${file}: ERROR - ${(e as Error).message}`);
    }
  }

  console.log('\n📋 Copy these values to Root.tsx:');
  console.log(
    `const STEP_TTS_DURATIONS = [${durations
      .slice(0, 4)
      .map((d) => d.toFixed(3))
      .join(', ')}];`
  );
  console.log(`const CLOSING_TTS_DURATION = ${durations[4]?.toFixed(3) ?? '3.0'};`);
}

main().catch(console.error);
