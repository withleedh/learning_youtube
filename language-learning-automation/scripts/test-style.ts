#!/usr/bin/env npx tsx
import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { generateIllustration } from '../src/image/generator';

async function main() {
  const outputDir = path.join(process.cwd(), 'output', 'style_test');
  await fs.mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'sketch_warm_test.png');

  console.log('🎨 Testing sketch_warm style...');
  await generateIllustration(
    'cafe conversation between friends',
    '카페에서 대화',
    'Two friends sitting at a cozy cafe, one male and one female, having a warm conversation over coffee',
    outputPath,
    'sketch_warm'
  );

  console.log(`✅ Done! Check: ${outputPath}`);
}

main().catch(console.error);
