#!/usr/bin/env npx tsx
/**
 * Episode Thumbnail Test Script
 *
 * Tests the new high-CTR episode thumbnail generation
 *
 * Usage:
 *   npx tsx scripts/test-episode-thumbnail.ts
 *   npx tsx scripts/test-episode-thumbnail.ts --topic "Getting Accepted"
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import {
  generateEpisodeThumbnail,
  addThumbnailTextOverlay,
  type EpisodeThumbnailOptions,
} from '../src/image/generator';
import type { Character, Category } from '../src/script/types';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let topic = 'Getting Accepted';
  let title = '합격 문자를 받았어요';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' && args[i + 1]) {
      topic = args[++i];
    }
    if (args[i] === '--title' && args[i + 1]) {
      title = args[++i];
    }
  }

  console.log(`
🎨 Episode Thumbnail Test
==========================
Topic: ${topic}
Title: ${title}
`);

  // Test characters
  const characters: Character[] = [
    {
      id: 'M',
      name: 'David',
      gender: 'male',
      ethnicity: 'American',
      role: 'supportive friend',
      appearance: {
        age: 'early 20s',
        hair: 'short, textured crew cut, dark brown',
        eyes: 'hazel',
        skin: 'tan',
        build: 'broad shoulders, athletic build',
        clothing: 'light blue button-down oxford shirt, sleeves rolled to elbows',
        distinctiveFeatures: 'clean-shaven',
      },
    },
    {
      id: 'F',
      name: 'Sarah',
      gender: 'female',
      ethnicity: 'American',
      role: 'student waiting for results',
      appearance: {
        age: 'early 20s',
        hair: 'long auburn hair, loose waves',
        eyes: 'green',
        skin: 'fair',
        build: 'petite and slender',
        clothing: 'lavender knit cardigan, white camisole top',
        distinctiveFeatures: 'small gold hoop earrings',
      },
    },
  ];

  const outputDir = path.join(process.cwd(), 'output', 'thumbnail_test');
  await fs.mkdir(outputDir, { recursive: true });

  const basePath = path.join(outputDir, 'thumbnail_base.png');
  const finalPath = path.join(outputDir, 'thumbnail_final.png');

  // Step 1: Generate base thumbnail
  console.log('📸 Step 1: Generating AI thumbnail base...');
  const options: EpisodeThumbnailOptions = {
    title,
    topic,
    characters,
    category: 'conversation' as Category,
    outputPath: basePath,
    subtitleText: '영어 듣기',
  };

  await generateEpisodeThumbnail(options);

  // Step 2: Add text overlay
  console.log('\n📝 Step 2: Adding text overlay...');
  await addThumbnailTextOverlay(basePath, title, '영어 듣기', finalPath);

  console.log(`
✅ Thumbnail generation complete!
📁 Base image: ${basePath}
📁 Final image: ${finalPath}

Open the final image to check:
- Character expression (should be exaggerated/excited)
- Background (should be simple, no busy details)
- Text visibility (yellow title, white subtitle)
`);
}

main().catch(console.error);
